'use client';

import { useApolloClient } from '@apollo/client/react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FILE_DOWNLOAD_URL_QUERY } from '@/lib/graphql/queries/uploads';

/**
 * SPRINT-2: Read-only attachment list with download buttons. Used by
 * gradebook/SpeedGrader (instructor view of submission attachments) and
 * by the student assignment page (instructor instructions).
 *
 * Triggers a presigned GET URL via fileDownloadUrl query on click —
 * never proxies bytes through the API.
 */

export interface AttachmentItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface Props {
  attachments: AttachmentItem[];
  emptyText?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentList({ attachments, emptyText }: Props) {
  const client = useApolloClient();

  const handleDownload = async (fileId: string) => {
    const res = await client.query<{
      fileDownloadUrl: { url: string; expiresIn: number };
    }>({
      query: FILE_DOWNLOAD_URL_QUERY,
      variables: { fileId },
      fetchPolicy: 'network-only',
    });
    const url = res.data?.fileDownloadUrl?.url;
    if (url) {
      // Open in new tab — R2 sends Content-Disposition: attachment, so
      // the browser downloads rather than navigating.
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!attachments.length) {
    if (!emptyText) return null;
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {attachments.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{a.originalName}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatSize(a.size)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            onClick={() => void handleDownload(a.id)}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </li>
      ))}
    </ul>
  );
}
