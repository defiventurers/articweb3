package xyz.arcticdominion.play;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
/** Online credentials and owner recovery access stay encrypted in app-private storage. */
final class CloudVault {
 private static final String ALIAS="ak-cloud-session-v1";
 private final Context context;
 interface KeyProvider { SecretKey get() throws Exception; }
 private final KeyProvider keys;
 CloudVault(Context context){this(context,null);}
 CloudVault(Context context,KeyProvider keys){this.context=context;this.keys=keys;}
 private SecretKey key() throws Exception {
  if(keys!=null)return keys.get();
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(!store.containsAlias(ALIAS)){KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());gen.generateKey();}
  return (SecretKey)store.getKey(ALIAS,null);
 }
 synchronized String get(){try{String saved=context.getSharedPreferences(ALIAS,Context.MODE_PRIVATE).getString("credential",null);if(saved==null)return "null";String[] parts=saved.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));return new String(c.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),"UTF-8");}catch(Exception e){return "null";}}
 synchronized boolean put(String value){try{if(value==null||value.equals("null"))return context.getSharedPreferences(ALIAS,Context.MODE_PRIVATE).edit().remove("credential").commit();if(!SessionCredential.isValid(value))return false;Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());String saved=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(value.getBytes("UTF-8")),Base64.NO_WRAP);return context.getSharedPreferences(ALIAS,Context.MODE_PRIVATE).edit().putString("credential",saved).commit();}catch(Exception e){return false;}}
}
