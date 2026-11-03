package xyz.arcticdominion.play;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
/** Temporary read-only access to a postcard explicitly shared by its player. */
public final class PostcardProvider extends ContentProvider {
 @Override public boolean onCreate(){return true;}
 private File postcard(Uri uri){String name=uri.getLastPathSegment();if(name==null||!name.matches("postcard-[0-9]+\\.png")||!("/"+name).equals(uri.getPath()))throw new IllegalArgumentException("Unknown postcard");return new File(new File(getContext().getCacheDir(),"postcards"),name);}
 @Override public String getType(Uri uri){postcard(uri);return "image/png";}
 @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order){File f=postcard(uri);String[] cols=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor c=new MatrixCursor(cols,1);Object[] values=new Object[cols.length];for(int i=0;i<cols.length;i++)values[i]=OpenableColumns.DISPLAY_NAME.equals(cols[i])?"AntarcticKingdoms-postcard.png":OpenableColumns.SIZE.equals(cols[i])?f.length():null;c.addRow(values);return c;}
 @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{if(!"r".equals(mode))throw new FileNotFoundException("Read-only postcard");return ParcelFileDescriptor.open(postcard(uri),ParcelFileDescriptor.MODE_READ_ONLY);}
 @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
 @Override public int delete(Uri uri,String selection,String[] args){throw new UnsupportedOperationException();}
 @Override public int update(Uri uri,ContentValues values,String selection,String[] args){throw new UnsupportedOperationException();}
}
