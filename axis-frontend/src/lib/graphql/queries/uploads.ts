import { graphql } from '@/lib/graphql/__generated__';

export const CONTEXT_FILES_QUERY = graphql(`
  query ContextFiles($context: UploadContext!, $contextId: String!) {
    contextFiles(context: $context, contextId: $contextId) {
      ...FileUploadFields
    }
  }
`);

export const FILE_DOWNLOAD_URL_QUERY = graphql(`
  query FileDownloadUrl($fileId: String!) {
    fileDownloadUrl(fileId: $fileId) {
      url
      expiresIn
    }
  }
`);
