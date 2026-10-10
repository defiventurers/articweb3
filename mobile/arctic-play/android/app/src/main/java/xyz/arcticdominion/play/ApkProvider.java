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

// Grant a temporary read-only stream of the installed APK. No storage permission.
public final class ApkProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    private void validate(Uri uri) { if (!"/ArcticPlay.apk".equals(uri.getPath())) throw new IllegalArgumentException("Unknown APK path"); }
    private File apk() { return new File(getContext().getApplicationInfo().sourceDir); }
    @Override public String getType(Uri uri) { validate(uri);return "application/vnd.android.package-archive"; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        validate(uri);String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE} : projection;
        MatrixCursor cursor = new MatrixCursor(columns,1);Object[] values = new Object[columns.length];
        for(int i=0;i<columns.length;i++)values[i]=OpenableColumns.DISPLAY_NAME.equals(columns[i])?"ArcticPlay-v1.0.0.apk":OpenableColumns.SIZE.equals(columns[i])?apk().length():null;
        cursor.addRow(values);return cursor;
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        validate(uri);if(!"r".equals(mode))throw new FileNotFoundException("Read-only APK");return ParcelFileDescriptor.open(apk(),ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String selection, String[] args) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
}
