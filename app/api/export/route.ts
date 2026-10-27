import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/dates'
import { APP_NAME } from '@/lib/brand'
import { LEGAL } from '@/lib/legal'

/**
 * Droit d'accès et à la portabilité (RGPD art. 15 et 20) : toutes les données
 * du compte dans un fichier JSON lisible par une machine.
 * Les règles de sécurité de la base ne renvoient que ce que l'utilisateur peut voir.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non connecté' }, { status: 401 })
  const me = user.id

  const q = async <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) => {
    const { data, error } = await p
    if (error) throw new Error(error.message)
    return data
  }

  try {
    const [
      profile, health, weights, activities, foodLogs, recipes, collections, likes, reviews,
      friendships, sharesGiven, sharesReceived, members, fridge, plan, shopping, products,
    ] = await Promise.all([
      q(supabase.from('profiles').select('*').eq('id', me).maybeSingle()),
      q(supabase.from('health_profiles').select('*').eq('user_id', me).maybeSingle()),
      q(supabase.from('weight_logs').select('logged_on, weight_kg').eq('user_id', me).order('logged_on')),
      q(supabase.from('activities').select('done_on, label, activity_key, duration_min, met, kcal_net, created_at').eq('user_id', me).order('done_on')),
      q(supabase.from('food_logs').select('*').eq('user_id', me).order('eaten_on')),
      q(supabase.from('recipes').select(`*,
        recipe_tags ( tags ( name ) ),
        ingredient_groups ( name, position, ingredients ( name, amount, unit, ciqual_code, weight_g, position ) ),
        steps ( position, content, image_url )`).eq('author_id', me).order('created_at')),
      q(supabase.from('collections').select('name, cover_image_url, created_at, collection_recipes ( recipes ( id, title ) )').eq('owner_id', me)),
      q(supabase.from('recipe_likes').select('created_at, recipes ( id, title )').eq('user_id', me)),
      q(supabase.from('recipe_reviews').select('rating, comment, created_at, updated_at, recipes ( id, title )').eq('user_id', me)),
      q(supabase.from('friendships').select('status, created_at, requester:profiles!requester_id ( full_name ), addressee:profiles!addressee_id ( full_name )')
        .or(`requester_id.eq.${me},addressee_id.eq.${me}`)),
      q(supabase.from('recipe_shares').select('created_at, recipes ( title ), to:profiles!user_id ( full_name )').eq('shared_by', me)),
      q(supabase.from('recipe_shares').select('created_at, recipes ( title ), from:profiles!shared_by ( full_name )').eq('user_id', me)),
      q(supabase.from('household_members').select('joined_at, profiles ( full_name )')),
      q(supabase.from('fridge_items').select('*')),
      q(supabase.from('meal_plan').select('*, recipes ( title )')),
      q(supabase.from('shopping_items').select('*')),
      q(supabase.from('custom_foods').select('*')),
    ])

    const body = {
      export: {
        app: APP_NAME,
        generated_at: new Date().toISOString(),
        privacy_policy_version: LEGAL.version,
        note: 'Toutes les données de ton compte. Les sections « foyer » sont partagées avec les membres de ton foyer.',
      },
      account: {
        id: me,
        email: user.email,
        created_at: user.created_at,
        privacy_accepted_at: user.user_metadata?.privacy_accepted_at ?? null,
        profile,
      },
      health: { profile: health, weights, activities, food_journal: foodLogs },
      kitchen: { recipes, collections, likes, reviews },
      friends: { friendships, recipes_i_shared: sharesGiven, recipes_shared_with_me: sharesReceived },
      household: { members, fridge, meal_plan: plan, shopping_list: shopping, scanned_products: products },
    }

    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="dignis-mes-donnees-${todayISO()}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return Response.json({ error: `Export impossible : ${(e as Error).message}` }, { status: 500 })
  }
}
