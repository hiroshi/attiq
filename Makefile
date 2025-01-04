KUBECTL = kubectl --cluster=gke_topics-server_us-west1-a_topics
IMAGE = us-west1-docker.pkg.dev/topics-server/attic/attic:$(TAG)
tag:
	$(eval TAG=$(shell git rev-parse --short HEAD))

docker-build: tag
	docker build --platform=linux/amd64 -t $(IMAGE) .

# NOTE: you may need: `gcloud auth configure-docker us-west1-docker.pkg.dev`
docker-push: tag
	docker push $(IMAGE)

export TAG
deploy: tag sleep
	cat gke/manifest.yaml | envsubst | $(KUBECTL) apply -f -
	$(KUBECTL) rollout status deployment/attic

# Wait for the pushed image will be available for deployment
sleep:
	sleep 1

.PHONY: config/credentials.yml.enc
config/credentials.yml.enc:
	docker compose run --rm -e EDITOR=nano app rails encrypted:edit config/credentials.yml.enc

