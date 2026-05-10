'use client';

import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  File,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CONTEXT_FILES_QUERY,
  FILE_DOWNLOAD_URL_QUERY,
} from '@/lib/graphql/queries/uploads';
import { DELETE_FILE_MUTATION } from '@/lib/graphql/mutations/uploads';
import type { UploadContext, UploadedFile } from './file-upload';

interface FileAttachmentListProps {
  context: UploadContext;
  contextId: string;
  /** Show delete button — only for the file's owner */
  allowDelete?: boolean;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))
    return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
  if (mimeType.startsWith('video/'))
    return <Film className="h-4 w-4" aria-hidden="true" />;
  if (mimeType.startsWith('audio/'))
    return <Music className="h-4 w-4" aria-hidden="true" />;
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/'))
    return <FileText className="h-4 w-4" aria-hidden="true" />;
  return <File className="h-4 w-4" aria-hidden="true" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({
  file,
  allowDelete,
  onDeleted,
}: {
  file: UploadedFile;
  allowDelete?: boolean;
  onDeleted: (id: string) => void;
}) {
  const [getDownloadUrl, { loading: downloading }] = useLazyQuery<{
    fileDownloadUrl: { url: string; expiresIn: number };
  }>(FILE_DOWNLOAD_URL_QUERY, { fetchPolicy: 'no-cache' });
  const [deleteFile, { loading: deleting }] = useMutation(DELETE_FILE_MUTATION);

  const handleDownload = async () => {
    const { data } = await getDownloadUrl({ variables: { fileId: file.id } });
    if (data?.fileDownloadUrl?.url) {
      // Open in new tab so the browser handles the download
      window.open(data.fileDownloadUrl.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async () => {
    await deleteFile({ variables: { fileId: file.id } });
    onDeleted(file.id);
  };

  return (
    <li className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">
        {getFileIcon(file.mimeType)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{file.originalName}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={`Download ${file.originalName}`}
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </Button>

        {allowDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={`Delete ${file.originalName}`}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </li>
  );
}

export function FileAttachmentList({
  context,
  contextId,
  allowDelete = false,
  className,
}: FileAttachmentListProps) {
  const { data, loading, refetch } = useQuery<{
    contextFiles: UploadedFile[];
  }>(CONTEXT_FILES_QUERY, {
    variables: { context, contextId },
    skip: !contextId,
  });

  const files: UploadedFile[] = data?.contextFiles ?? [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>Loading attachments…</span>
      </div>
    );
  }

  if (files.length === 0) return null;

  const handleDeleted = (id: string) => {
    // Refetch after delete to sync the list
    void refetch();
    void id;
  };

  return (
    <ul className={className} aria-label="Attachments">
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          allowDelete={allowDelete}
          onDeleted={handleDeleted}
        />
      ))}
    </ul>
  );
}
