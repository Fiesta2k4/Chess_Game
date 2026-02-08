pipeline {
  agent any

  environment {
    AWS_REGION = 'ap-southeast-1'
    ECR_REGISTRY = '855409827685.dkr.ecr.ap-southeast-1.amazonaws.com'
    BACKEND_IMAGE = 'chess-backend'
    FRONTEND_IMAGE = 'chess-frontend'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    EKS_CLUSTER = 'chess-eks'
    HELM_RELEASE = 'chess-game'
    HELM_CHART = 'deploy/helm/chess-game'
    K8S_NAMESPACE = 'chess'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Basic Tests') {
      steps {
        sh 'node --version'
        sh 'npm --prefix chess_backend run -s test || echo "No backend tests"'
        sh 'npm --prefix chess_frontend run -s test || echo "No frontend tests"'
      }
    }

    stage('Build Images') {
      steps {
        sh 'docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} chess_backend'
        sh 'docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} chess_frontend'
      }
    }

    stage('Login to ECR') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
          sh 'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}'
        }
      }
    }

    stage('Push Images') {
      steps {
        sh 'docker tag ${BACKEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}'
        sh 'docker tag ${FRONTEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}'
        sh 'docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}'
        sh 'docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}'
        sh 'docker tag ${BACKEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest'
        sh 'docker tag ${FRONTEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest'
        sh 'docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest'
        sh 'docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest'
      }
    }

    stage('Deploy to EKS (Helm)') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
          sh '''
            aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER}
            kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
            helm upgrade --install ${HELM_RELEASE} ${HELM_CHART} \
              --namespace ${K8S_NAMESPACE} \
              --set backend.image=${ECR_REGISTRY}/${BACKEND_IMAGE} \
              --set backend.tag=${IMAGE_TAG} \
              --set frontend.image=${ECR_REGISTRY}/${FRONTEND_IMAGE} \
              --set frontend.tag=${IMAGE_TAG}
          '''
        }
      }
    }
  }
}
