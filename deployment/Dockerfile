# Overrides the default image in deployment-scripts. pipeline-build.sh picks this
# up automatically: `DOCKER_FOLDER=./deployment` when ./deployment/Dockerfile
# exists, otherwise ./node_modules/deployment-scripts/ (pipeline-build.sh:6-7).
#
# NOTE ON CONTEXT: pipeline-build.sh passes ./deployment as the build context, so
# the repo files are NOT visible to COPY here. Like the default image, this one
# SSH-clones the repo instead — the clone, not the context, is the source of truth.
#
# Differences from the default:
#   - Node pinned (default is node:latest, which moves under us between builds).
#   - forever installed in the image rather than via a package.json postinstall
#     hook, so `npm ci` stays side-effect-free and dev machines don't get a global.
#   - git + openssh-client installed explicitly: the `utilities` dep resolves to
#     bitbucket:myfy/utilities, so `npm ci` itself shells out to git over SSH.
FROM node:22-bookworm-slim

# ssh-agent/ssh-add come from openssh-client; ca-certificates is needed for the
# registry fetches that npm ci does alongside the git dep.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git openssh-client ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG CONTAINER_NAME
ARG DEPLOYMENT_BRANCH_NAME
# Invalidates the clone layer per commit — passed as $BITBUCKET_COMMIT by
# pipeline-build.sh, without which docker would reuse a stale clone.
ARG CACHE_BUST

RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan bitbucket.org >> ~/.ssh/known_hosts

# The clone key arrives as a BuildKit secret (--secret id=id_rsa,env=ID_RSA), so
# it is mounted for this RUN only and never lands in a layer. npm ci runs inside
# the same RUN because it needs the same agent to fetch bitbucket:myfy/utilities.
RUN --mount=type=secret,id=id_rsa \
  eval "$(ssh-agent -s)" && \
  cat /run/secrets/id_rsa | base64 -d | ssh-add - && \
  git clone -b $DEPLOYMENT_BRANCH_NAME --single-branch git@bitbucket.org:myfy/$CONTAINER_NAME.git && \
  cd $CONTAINER_NAME && npm ci --no-audit --no-fund --omit=dev

# start.sh drives the process with forever; it is not a project dependency.
RUN npm install -g forever

WORKDIR /app/$CONTAINER_NAME

# Matches the default image's contract — launch-container.sh expects the
# container's command to be start.sh and to stay in the foreground.
CMD [ "bash", "start.sh" ]
