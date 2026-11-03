package xyz.arcticdominion.play;

import org.json.JSONObject;
import java.util.Locale;
import java.util.regex.Pattern;

/** Storage schema only. Owner access is independently verified on every app launch. */
final class SessionCredential {
 private static final Pattern SESSION=Pattern.compile("[a-f0-9-]{36}[.][A-Za-z0-9_-]{43}");
 private static final Pattern OWNER=Pattern.compile("AK-OWNER-(?:[0-9A-F]{6}-){7}[0-9A-F]{6}");
 static boolean isValid(String value){
  if(value==null||value.length()>2048)return false;
  try{
   JSONObject parsed=new JSONObject(value);
   Object session=parsed.opt("session"),owner=parsed.opt("ownerRecovery"),account=parsed.opt("accountId");
   boolean hasSession=session!=null&&session!=JSONObject.NULL;
   boolean hasOwner=owner!=null&&owner!=JSONObject.NULL;
   boolean hasAccount=account!=null&&account!=JSONObject.NULL;
   if(!hasSession&&!hasOwner)return false;
   if(hasSession){
    if(!(session instanceof String)||!SESSION.matcher((String)session).matches())return false;
    if(!(account instanceof String)||!((String)session).startsWith((String)account+"."))return false;
   }else if(hasAccount)return false;
   if(hasOwner&&(!(owner instanceof String)||!OWNER.matcher(((String)owner).trim().toUpperCase(Locale.ROOT)).matches()))return false;
   return true;
  }catch(Exception error){return false;}
 }
}
