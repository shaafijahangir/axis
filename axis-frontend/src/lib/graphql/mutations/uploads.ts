import { graphql } from '@/lib/graphql/__generated__';

export const FILE_UPLOAD_FIELDS = graphql(`
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
`);

export const REQUEST_UPLOAD_MUTATION = graphql(`
  mutation RequestUpload($input: RequestUploadInput!) {
    requestUpload(input: $input) {
      fileId
      uploadUrl
      key
      expiresIn
    }
  }
`);

export const CONFIRM_UPLOAD_MUTATION = graphql(`
  mutation ConfirmUpload($input: ConfirmUploadInput!) {
    confirmUpload(input: $input) {
      ...FileUploadFields
    }
  }
`);

export const ATTACH_UPLOAD_MUTATION = graphql(`
  mutation AttachUpload($input: AttachUploadInput!) {
    attachUpload(input: $input) {
      ...FileUploadFields
    }
  }
`);

export const DELETE_FILE_MUTATION = graphql(`
  mutation DeleteFile($fileId: String!) {
    deleteFile(fileId: $fileId)
  }
`);
