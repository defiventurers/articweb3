'use strict';
// TLS is mandatory for external databases. URL flags must not overwrite certificate validation.
function databaseOptions(databaseUrl,env=process.env){
 const url=new URL(databaseUrl);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Invalid database protocol.');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 const internal=!url.hostname.includes('.')&&url.hostname.startsWith('dpg-');
 const requested=url.searchParams.get('sslmode');
 const useTls=env.DATABASE_SSL==='true'||!local&&!internal||requested&&requested!=='disable';
 if(url.searchParams.has('sslkey')||url.searchParams.has('sslcert')||url.searchParams.has('sslrootcert'))throw Error('Use server-managed database TLS configuration.');
 for(const key of ['ssl','sslmode','uselibpqcompat','sslnegotiation'])url.searchParams.delete(key);
 return {connectionString:url.href,ssl:useTls?{rejectUnauthorized:true,...(env.DATABASE_CA_CERT?{ca:env.DATABASE_CA_CERT}:{})}:false,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,max:5};
}
module.exports={databaseOptions};
