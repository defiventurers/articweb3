package xyz.arcticdominion.play;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

public final class VaultRegression {
 static int checks=0;
 static void check(boolean valid,String message){if(!valid)throw new AssertionError(message);checks++;}
 static String repeat(String text,int n){StringBuilder b=new StringBuilder();for(int i=0;i<n;i++)b.append(text);return b.toString();}
 static final class Preferences implements SharedPreferences {
  Map<String,String> saved=new HashMap<String,String>();boolean failCommit;
  public String getString(String key,String fallback){return saved.containsKey(key)?saved.get(key):fallback;}
  public Editor edit(){return new Editor(){Map<String,String> next=new HashMap<String,String>(saved);
   public Editor putString(String key,String value){next.put(key,value);return this;}
   public Editor remove(String key){next.remove(key);return this;}
   public boolean commit(){if(failCommit)return false;saved=next;return true;}
  };}
 }
 static final class AppContext extends Context {
  final Preferences prefs=new Preferences();
  public SharedPreferences getSharedPreferences(String name,int mode){return prefs;}
 }
 public static void main(String[] args)throws Exception{
  final AppContext app=new AppContext();KeyGenerator generator=KeyGenerator.getInstance("AES");generator.init(256);final SecretKey key=generator.generateKey();
  CloudVault vault=new CloudVault(app,()->key);
  String ownerCode="AK-OWNER-ABCDEF-ABCDEF-ABCDEF-ABCDEF-ABCDEF-ABCDEF-ABCDEF-ABCDEF";
  String owner=new JSONObject().put("ownerRecovery",ownerCode).toString();
  String id="11111111-1111-4111-8111-111111111111";
  String online=new JSONObject().put("accountId",id).put("session",id+"."+repeat("q",43)).toString();
  String combined=new JSONObject(online).put("ownerRecovery",ownerCode).put("email",repeat("e",240)+"@example.test").put("marketingChoiceNeeded",false).toString();
  check(vault.get().equals("null"),"Empty vault");
  check(SessionCredential.isValid(owner),"Owner-only credential must not require an online session");
  check(vault.put(owner),"Owner recovery must pass the actual native save routine");
  String ciphertext=app.prefs.saved.get("credential");
  check(!ciphertext.contains(ownerCode)&&!ciphertext.contains("ownerRecovery"),"Secrets must stay encrypted");
  check(vault.get().equals(owner),"Owner-only encrypted round-trip");
  check(new CloudVault(app,()->key).get().equals(owner),"Owner access survives a fresh vault instance");
  check(vault.put(owner),"Second owner save");
  check(!ciphertext.equals(app.prefs.saved.get("credential")),"AES-GCM IV must be freshly generated");
  check(vault.put(online)&&vault.get().equals(online),"Existing online account credentials keep working");
  check(vault.put(combined)&&vault.get().equals(combined),"Combined owner and online credentials round-trip");
  for(String invalid:new String[]{"{}","{broken",new JSONObject().put("ownerRecovery",true).toString(),new JSONObject().put("ownerRecovery","bad").toString(),new JSONObject().put("session","invalid").toString(),new JSONObject(online).put("accountId","22222222-2222-4222-8222-222222222222").toString(),new JSONObject(owner).put("session",true).toString(),new JSONObject(owner).put("extra",repeat("x",2200)).toString()})check(!vault.put(invalid),"Malformed storage payload must be rejected");
  app.prefs.failCommit=true;check(!vault.put(owner),"A real persistence failure must be reported");app.prefs.failCommit=false;
  check(vault.get().equals(combined),"Failed writes preserve the previous encrypted session");
  check(!new CloudVault(app,()->{throw new java.security.GeneralSecurityException("fixture");}).put(owner),"Keystore failure must not use a plaintext fallback");
  check(vault.get().equals(combined),"Keystore failure preserves existing saved access");
  app.prefs.saved.put("credential","broken:base64");check(vault.get().equals("null"),"Corrupt encrypted data fails closed");
  check(vault.put(owner),"Recovery works after a corrupt saved record");
  check(vault.put("null")&&vault.get().equals("null"),"Sign-out clears encrypted owner access");
  System.out.println("{\"nativeVaultChecksPassed\":"+checks+",\"usesActualCloudVaultAndSessionCredential\":true,\"androidKeystoreProviderEmulatedByJvmAesKey\":true}");
 }
}
