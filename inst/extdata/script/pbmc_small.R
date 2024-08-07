library(Seurat)
pbmc_small
pbmc_small <- RunUMAP(pbmc_small, n.components = 3L, dims=1:15)
head(pbmc_small)
Reductions(pbmc_small)
head(Embeddings(pbmc_small[["umap"]]))
exp <- GetAssayData(pbmc_small, assay = 'RNA', layer = 'data')
dim(exp)
exp <- t(as.data.frame(exp))
markers <- FindAllMarkers(pbmc_small, only.pos = TRUE, min.pct = .5)
markers <- lapply(split(markers, markers$cluster), function(.ele) .ele[1:3, 'gene'])
markers <- unique(unlist(markers))
dat <- cbind(Embeddings(pbmc_small[["umap"]]), pbmc_small[[]][, -1], exp[, markers])
saveRDS(dat, 'inst/extdata/pbmc_small.3d.rds')
