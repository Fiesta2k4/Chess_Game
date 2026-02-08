# Hướng dẫn triển khai EKS + Grafana (Prometheus)

Tài liệu này triển khai Chess Game lên EKS bằng Helm và cài Prometheus + Grafana qua kube-prometheus-stack.

## 1) Điều kiện trước (Prerequisites)
**Mục đích:** đảm bảo bạn có đủ công cụ và quyền để tạo tài nguyên AWS/Kubernetes.
- AWS CLI đã cấu hình IAM user/role có quyền tạo EKS, ECR, VPC
- Đã cài `kubectl` và `helm`
- Đã cài Docker để build image

## 2) Tạo repository trên ECR
**Mục đích:** nơi lưu trữ Docker image cho backend và frontend.
```
aws ecr create-repository --repository-name chess-backend --region ap-southeast-1
aws ecr create-repository --repository-name chess-frontend --region ap-southeast-1
```

## 3) Build và đẩy Docker image lên ECR
**Mục đích:** tạo image từ code và đưa lên ECR để EKS kéo về chạy.
```
export AWS_REGION=ap-southeast-1
export ACCOUNT_ID=<your_account_id>
export ECR=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR}

docker build -t chess-backend:latest chess_backend
 docker tag chess-backend:latest ${ECR}/chess-backend:latest
 docker push ${ECR}/chess-backend:latest

docker build -t chess-frontend:latest chess_frontend
 docker tag chess-frontend:latest ${ECR}/chess-frontend:latest
 docker push ${ECR}/chess-frontend:latest
```

## 4) Tạo EKS cluster
**Mục đích:** tạo cụm Kubernetes để chạy ứng dụng.
Chọn 1 trong 2 cách:

### Cách A: eksctl (khuyến nghị)
```
cat > eksctl.yaml <<'EOF'
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: chess-eks
  region: ap-southeast-1
nodeGroups:
  - name: ng-1
    instanceType: t3.medium
    desiredCapacity: 2
    minSize: 1
    maxSize: 3
EOF

eksctl create cluster -f eksctl.yaml
```

### Cách B: Terraform (EKS module)
**Mục đích:** nếu bạn muốn IaC bằng Terraform. Repo hiện có Terraform EC2, chưa có EKS module.

## 5) Cấu hình kubectl
**Mục đích:** kết nối máy local với cluster EKS để thao tác.
```
aws eks update-kubeconfig --region ap-southeast-1 --name chess-eks
kubectl get nodes
```

## 6) Cài NGINX Ingress Controller
**Mục đích:** tạo cổng vào HTTP/HTTPS cho các service trong cluster.
```
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

## 7) Cài Prometheus + Grafana
**Mục đích:** thu thập metrics và hiển thị dashboard giám sát.
```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

Lấy mật khẩu Grafana admin:
```
kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```
Port-forward Grafana:
```
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
```
Mở trình duyệt: http://localhost:3000

## 8) Deploy Chess Game bằng Helm
**Mục đích:** triển khai backend/frontend/mongo lên EKS.

Cập nhật `values.yaml` tại deploy/helm/chess-game/values.yaml:
- backend.image: <ECR>/chess-backend
- frontend.image: <ECR>/chess-frontend
- ingress.enabled: true
- ingress.host: <your domain>

Áp dụng:
```
kubectl create namespace chess --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install chess-game deploy/helm/chess-game \
  --namespace chess
```

## 9) Expose Grafana/Prometheus (tuỳ chọn)
**Mục đích:** truy cập monitoring từ internet qua Ingress + TLS.

## 10) Xác nhận metrics
**Mục đích:** đảm bảo Prometheus có thể scrape backend.
```
kubectl -n chess get servicemonitor
```

## 11) Jenkins (EKS)
**Mục đích:** CI/CD tự động build image, push ECR và deploy Helm lên EKS.
Pipeline trong [Jenkinsfile](../Jenkinsfile) yêu cầu:
- Jenkins agent có: awscli, kubectl, helm, docker
- Credentials: AWS (id: aws-credentials)

Biến môi trường cần set trong Jenkinsfile:
- AWS_REGION, ECR_REGISTRY, EKS_CLUSTER, HELM_RELEASE, K8S_NAMESPACE

## 12) Health checks
**Mục đích:** kiểm tra trạng thái dịch vụ sau khi deploy.
- Backend: http://<backend-service>/health
- Frontend: http://<ingress-host>/

## 13) Ghi chú
- Nếu dùng ALB Ingress thay NGINX, cần đổi controller và thêm annotation.
- Production nên bật TLS bằng cert-manager + ACM hoặc Let’s Encrypt.
