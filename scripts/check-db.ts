import { config } from 'dotenv'
config({ path: '.env.local' })

import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

// Node.js < 22 n'a pas WebSocket natif — requis par @supabase/realtime-js
// @ts-ignore
globalThis.WebSocket = ws

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Service role bypasse RLS — idéal pour un script de vérification.
// Fallback sur la publishable key (sera bloqué par RLS si non authentifié).
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY absent — RLS peut masquer les données.\n' +
    '   Ajoute-la dans .env.local (Dashboard → Settings → API → service_role).\n',
  )
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}

async function checkDb() {
  console.log(`\n🔍 Connexion à ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`)

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      id,
      title,
      difficulty,
      prep_time_min,
      cook_time_min,
      base_servings,
      ingredient_groups ( id, name, ingredients ( id ) ),
      steps ( id )
    `)
    .order('created_at')

  if (error) {
    console.error('❌ Erreur Supabase :', error.message)
    console.error('   Code          :', error.code)
    process.exit(1)
  }

  if (!recipes.length) {
    console.log('⚠️  Aucune recette trouvée — le seed n\'a peut-être pas été appliqué.')
    process.exit(0)
  }

  console.log(`✅ ${recipes.length} recette(s) trouvée(s)\n`)
  console.log('─'.repeat(56))

  for (const recipe of recipes) {
    const totalIngredients = recipe.ingredient_groups.reduce(
      (sum, g) => sum + g.ingredients.length,
      0,
    )

    console.log(`\n📖  ${recipe.title}`)
    console.log(
      `    Difficulté  : ${DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}`,
    )
    console.log(
      `    Temps       : ${recipe.prep_time_min} min prep + ${recipe.cook_time_min} min cuisson`,
    )
    console.log(`    Portions    : ${recipe.base_servings}`)
    console.log(
      `    Ingrédients : ${totalIngredients} (${recipe.ingredient_groups.length} groupe(s))`,
    )
    console.log(`    Étapes      : ${recipe.steps.length}`)
  }

  console.log('\n' + '─'.repeat(56))
  console.log('✅ Base de données opérationnelle.\n')
}

checkDb()
