import { readFileSync, writeFileSync } from 'fs'
const file = 'C:/Users/User/Downloads/selline (3)/selline/backend/src/db.js'
let c = readFileSync(file, 'utf8')
if (c.includes('cat-autre')) { console.log('Already has cat-autre'); process.exit(0) }
c = c.replace("'alimentation'],\n]", "'alimentation'],\n  ['cat-autre', 'Autre', 'autre'],\n]")
writeFileSync(file, c, 'utf8')
console.log('Done:', c.includes('cat-autre'))
