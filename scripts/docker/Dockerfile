# Environnement de validation identique pour toute l'équipe (macOS, Windows, Linux).
# Node 22 (≥ 22.18, requis par oxlint) + pnpm 12.18.0 + Go 1.27.
# Construit et lancé par scripts/docker-check.sh (bash) ou scripts/docker-check.ps1 (PowerShell).

FROM golang:1.27-bookworm AS go

FROM node:22-bookworm

COPY --from=go /usr/local/go /usr/local/go
ENV GOPATH=/go \
	PATH=/usr/local/go/bin:/go/bin:$PATH \
	GOTOOLCHAIN=local \
	CI=true

# npm exécute le postinstall de pnpm 12 (binaire natif) : voir docs/setup.md.
RUN npm install -g pnpm@12.18.0 \
	&& pnpm -v \
	&& go version \
	&& node -v

WORKDIR /work
