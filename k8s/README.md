# Kubernetes deployment

## Build images

```bash
# From project root
docker build -t kirby-server:latest ./serv
docker build -t kirby-client:latest ./client
```

## Load images (Kind / Minikube)

```bash
# Kind
kind load docker-image kirby-server:latest kirby-client:latest

# Minikube
eval $(minikube docker-env)
docker build -t kirby-server:latest ./serv
docker build -t kirby-client:latest ./client
```

## Deploy

```bash
kubectl apply -f server.yaml
kubectl apply -f client.yaml
```

## Access

```bash
# Port-forward for local testing
kubectl port-forward svc/kirby-server 3000:3000 &
kubectl port-forward svc/kirby-client 5173:5173 &
# Client: http://localhost:5173
```

To expose externally, change `type: ClusterIP` to `type: LoadBalancer` or `type: NodePort` in the Services.
