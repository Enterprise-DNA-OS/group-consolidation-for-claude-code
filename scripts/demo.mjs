import {getDb,loadEnv} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,format} from './group.mjs';
loadEnv();if(process.env.DATABASE_URL)throw Error('Demo refuses DATABASE_URL');
const db=await getDb();try{await migrate(db);await seed(db);for(const cmd of ['attention','intercompany','budget-variance'])console.log('\n'+cmd+'\n'+format(await run(db,[cmd,'--period=2026-09'])));}finally{await db.close();}
