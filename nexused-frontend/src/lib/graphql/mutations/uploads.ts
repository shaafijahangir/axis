import { gql } from '@apollo/client';

export const FILE_UPLOAD_FIELDS = gql`
  fragment FileUploadFields on FileUpload {
    id
    key
    originalName
    mimeType
    size
    context
    contextId
    uploadedById
    confirmed
    createdAt
  }
`;

export const REQUEST_UPLOAD_MUTATION = gql`
  mutation RequestUpload($input: RequestUploadInput!) {
    requestUpload(input: $input) {
      fileId
      uploadUrl
      key
      expiresIn
    }
  }
`;

export const CONFIRM_UPLOAD_MUTATION = gql`
  ${FILE_UPLOAD_FIELDS}
  mutation ConfirmUpload($input: ConfirmUploadInput!) {
    confirmUpload(input: $input) {
      ...FileUploadFields
    }
  }
`;

export const ATTACH_UPLOAD_MUTATION = gql`
  ${FILE_UPLOAD_FIELDS}
  mutation AttachUpload($input: AttachUploadInput!) {
    attachUpload(input: $input) {
      ...FileUploadFields
    }
  }
`;

export const DELETE_FILE_MUTATION = gql`
  mutation DeleteFile($fileId: String!) {
    deleteFile(fileId: $fileId)
  }
`;
