import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,loadEnv,REPO_ROOT} from './lib/db.mjs';
export async function seed(db){if((await db.query('select id from entities limit 1')).length)return;await db.exec('BEGIN');try{await db.exec(readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){loadEnv();if(process.env.DATABASE_URL)throw Error('Demo seed refuses DATABASE_URL');const db=await getDb();try{await seed(db);console.log('Fictional group data seeded');}finally{await db.close();}}
