import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CopyImageValue,
  isCopyImageValue,
  uploadCopyAsset,
  deleteCopyAsset,
  signCopyAssetUrl,
} from "@/lib/copy/imageStorage";

interface ImageOutputFieldProps {
  label: string;
  value: any;
  documentId: string | null;
  subAccountId: string | null;
  onChange: (value: CopyImageValue | null) => void;
  readOnly?: boolean;
}

/**
 * Generic image upload field used inside Copy Documents.
 * The uploaded creative is stored in the `copy-assets` bucket and its
 * path is persisted in `copy_document_components.outputs[key]`.
 *
 * Not Meta-Ads-specific — reusable for any framework that declares an
 * `image` output field (VSL thumbnails, email hero, social posts, …).
 */
const ImageOutputField = ({ label, value, documentId, subAccountId, onChange, readOnly }: ImageOutputFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isCopyImageValue(value)) { setSignedUrl(null); return; }
    signCopyAssetUrl(value.path).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [value]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!documentId || !subAccountId) {
      toast.error("Save the document before uploading images.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadCopyAsset(subAccountId, documentId, file);
      onChange(uploaded);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (isCopyImageValue(value)) {
      try { await deleteCopyAsset(value.path); } catch { /* keep the metadata cleared even if delete fails */ }
    }
    onChange(null);
  };

  const hasImage = isCopyImageValue(value);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {hasImage ? (
        <div className="space-y-2">
          <div className="rounded-md border border-border overflow-hidden bg-muted/30">
            {signedUrl ? (
              <img src={signedUrl} alt={label} className="w-full max-h-64 object-contain" />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-muted-foreground text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Upload className="w-3 h-3 mr-1" /> {uploading ? "Uploading..." : "Replace"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRemove}>
                <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        !readOnly && (
          <>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-16 text-xs border-dashed"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><ImageIcon className="w-3.5 h-3.5 mr-2" /> Upload image</>
              )}
            </Button>
          </>
        )
      )}
    </div>
  );
};

export default ImageOutputField;
