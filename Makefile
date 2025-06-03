KUBECTL := kubectl --cluster=microk8s-cluster
IMAGE := ghcr.io/hiroshi/attiq

tag:
	$(eval TAG=$(shell git rev-parse --short HEAD))

docker-build: tag
	docker build --platform=linux/amd64 -t $(IMAGE):$(TAG) .
	docker tag $(IMAGE):$(TAG) $(IMAGE):latest

# NOTE: echo $(gh auth token) | docker login ghcr.io -u hiroshi --password-stdin
docker-push: tag
	docker push $(IMAGE):$(TAG)

export IMAGE
export TAG
deploy: tag sleep
	cat gke/manifest.yaml | envsubst | $(KUBECTL) apply -f -
	$(KUBECTL) rollout status deployment/attiq

master-key:
	$(KUBECTL) create secret generic attiq-master-key --from-file=master.key=config/master.key

# Wait for the pushed image will be available for deployment
sleep:
	sleep 1

.PHONY: config/credentials.yml.enc
config/credentials.yml.enc:
	docker compose run --rm -e EDITOR=nano app rails encrypted:edit config/credentials.yml.enc
