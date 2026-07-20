# Luxaria Developers — S3 storage

Shared bucket: `classiccart-storage-bucket` (ap-south-1)

All Luxaria files are stored under prefix:

```
luxaria-developers/
  bills/
  vouchers/
  signatures/
  grn-photos/
  agreements/
  payment-receipts/
  gst-challans/
  other/
  {companyId}/{projectId}/{DOC_TYPE}/...
```

Other projects on the same bucket stay outside this folder.
