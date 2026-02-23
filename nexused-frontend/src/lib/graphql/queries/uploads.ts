import { gql } from '@apollo/client';
import { FILE_UPLOAD_FIELDS } from '../mutations/uploads';

export const CONTEXT_FILES_QUERY = gql`
  ${FILE_UPLOAD_FIELDS}
  query ContextFiles($context: UploadContext!, $contextId: String!) {
    contextFiles(context: $context, contextId: $contextId) {
      ...FileUploadFields
    }
  }
`;

export const FILE_DOWNLOAD_URL_QUERY = gql`
  query FileDownloadUrl($fileId: String!) {
    fileDownloadUrl(fileId: $fileId) {
      url
      expiresIn
    }
  }
`;
