'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  REQUEST_UPLOAD_MUTATION,
  CONFIRM_UPLOAD_MUTATION,
} from '@/lib/graphql/mutations/uploads';

export type UploadContext =
  | 'assignment_submission'
  | 'assignment_instructions'
  | 'profile_picture'
  | 'course_content'
  | 'import_document';

export interface UploadedFile {
  id: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  context: UploadContext;
  contextId: string | null;
  confirmed: boolean;
  createdAt: string;
}

interface FileUploadProps {
  context: UploadContext;
  contextId?: string;
  onUploadComplete: (file: UploadedFile) => void;
  maxFiles?: number;
  /** Override default size limit (bytes) */
  maxSize?: number;
  /** Override default accepted mime types */
  accept?: string;
  disabled?: boolean;
  className?: string;
}

interface PendingFile {
  file: File;
  status: 'pending' | 'uploading' | 'confirming' | 'done' | 'error';
  progress: number;
  error?: string;
  result?: UploadedFile;
}

const DEFAULT_ACCEPT: Record<UploadContext, string> = {
  assignment_submission:
    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.zip',
  assignment_instructions:
    '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.zip',
  profile_picture: '.jpg,.jpeg,.png,.webp,.gif',
  course_content: '.pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.txt',
  import_document: '.pdf,.txt,.csv,.xlsx',
};

const MAX_SIZE_LABEL: Record<UploadContext, string> = {
  assignment_submission: '50 MB',
  assignment_instructions: '50 MB',
  profile_picture: '5 MB',
  course_content: '100 MB',
  import_document: '20 MB',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  context,
  contextId,
  onUploadComplete,
  maxFiles = 10,
  maxSize,
  accept,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [requestUpload] = useMutation<{
    requestUpload: {
      fileId: string;
      uploadUrl: string;
      key: string;
      expiresIn: number;
    };
  }>(REQUEST_UPLOAD_MUTATION);
  const [confirmUpload] = useMutation<{ confirmUpload: UploadedFile }>(
    CONFIRM_UPLOAD_MUTATION,
  );

  const updateFile = useCallback(
    (index: number, patch: Partial<PendingFile>) => {
      setPendingFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File, index: number) => {
      updateFile(index, { status: 'uploading', progress: 0 });

      try {
        // Phase 1: Get presigned PUT URL from backend
        const { data: reqData } = await requestUpload({
          variables: {
            input: {
              filename: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              context,
              contextId: contextId ?? null,
            },
          },
        });

        if (!reqData) throw new Error('Upload request failed — no response');
        const { fileId, uploadUrl } = reqData.requestUpload;

        // Phase 2: PUT directly to R2 — backend never sees the file bytes
        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              updateFile(index, {
                progress: Math.round((e.loaded / e.total) * 95),
              });
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
          });
          xhr.addEventListener('error', () =>
            reject(new Error('Network error during upload')),
          );
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader(
            'Content-Type',
            file.type || 'application/octet-stream',
          );
          xhr.send(file);
        });

        updateFile(index, { status: 'confirming', progress: 98 });

        // Phase 3: Notify backend — creates confirmed FileUpload record
        const { data: confirmData } = await confirmUpload({
          variables: { input: { fileId } },
        });

        if (!confirmData)
          throw new Error('Upload confirm failed — no response');
        const uploadedFile: UploadedFile = confirmData.confirmUpload;
        updateFile(index, {
          status: 'done',
          progress: 100,
          result: uploadedFile,
        });
        onUploadComplete(uploadedFile);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Upload failed. Please retry.';
        updateFile(index, { status: 'error', error: message });
      }
    },
    [
      context,
      contextId,
      requestUpload,
      confirmUpload,
      onUploadComplete,
      updateFile,
    ],
  );

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles = Array.from(fileList).slice(
        0,
        maxFiles - pendingFiles.length,
      );
      const startIndex = pendingFiles.length;
      const pending: PendingFile[] = newFiles.map((f) => ({
        file: f,
        status: 'pending',
        progress: 0,
      }));
      setPendingFiles((prev) => [...prev, ...pending]);
      newFiles.forEach((_, i) => uploadFile(newFiles[i], startIndex + i));
    },
    [maxFiles, pendingFiles.length, uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) addFiles(e.dataTransfer.files);
    },
    [disabled, addFiles],
  );

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canAddMore = pendingFiles.length < maxFiles && !disabled;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload files — click or drag and drop"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-sm transition-colors',
            isDragging
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <Upload className="h-8 w-8" aria-hidden="true" />
          <span className="font-medium">Click to upload or drag and drop</span>
          <span className="text-xs">
            {accept ?? DEFAULT_ACCEPT[context]} · max{' '}
            {maxSize ? formatBytes(maxSize) : MAX_SIZE_LABEL[context]}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept ?? DEFAULT_ACCEPT[context]}
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* File list */}
      {pendingFiles.length > 0 && (
        <ul className="space-y-2" aria-label="Uploaded files">
          {pendingFiles.map((pf, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
            >
              {/* Status icon */}
              <span aria-hidden="true" className="shrink-0">
                {pf.status === 'done' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {pf.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                {(pf.status === 'uploading' || pf.status === 'confirming') && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {pf.status === 'pending' && (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </span>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{pf.file.name}</p>
                {pf.status === 'error' ? (
                  <p className="text-xs text-destructive">{pf.error}</p>
                ) : pf.status === 'done' ? (
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(pf.file.size)} · uploaded
                  </p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    <Progress value={pf.progress} className="h-1" />
                    <p className="text-xs text-muted-foreground">
                      {pf.status === 'confirming'
                        ? 'Saving…'
                        : `${pf.progress}%`}
                    </p>
                  </div>
                )}
              </div>

              {/* Remove button */}
              {(pf.status === 'done' || pf.status === 'error') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${pf.file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
