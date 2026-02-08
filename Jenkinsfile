pipeline {
  agent { label 'windows-docker' }

  // Nếu bạn không chạy npm trong pipeline thì bỏ tools nodejs cho nhẹ và ổn định hơn
  // tools { nodejs 'node18' }

  environment {
    AWS_REGION   = 'ap-southeast-1'
    ECR_REGISTRY = '855409827685.dkr.ecr.ap-southeast-1.amazonaws.com'

    BACKEND_IMAGE  = 'chess-backend'
    FRONTEND_IMAGE = 'chess-frontend'
    IMAGE_TAG      = "${BUILD_NUMBER}"

    EKS_CLUSTER  = 'chess-eks'
    HELM_RELEASE = 'chess-game'
    HELM_CHART   = 'deploy/helm/chess-game'
    K8S_NAMESPACE = 'chess'
  }

  options { timestamps() }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Preflight (Tools)') {
      steps {
        bat 'docker version'
        bat 'aws --version'
        bat 'kubectl version --client --output=yaml'
        bat 'helm version'
      }
    }

    stage('Build Images') {
      steps {
        bat 'docker build -t %BACKEND_IMAGE%:%IMAGE_TAG% chess_backend'
        bat 'docker build -t %FRONTEND_IMAGE%:%IMAGE_TAG% chess_frontend'
      }
    }

    stage('Login to ECR') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
          // CMD on Windows: pipe password into docker login
          bat 'aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_REGISTRY%'
        }
      }
    }

    stage('Push Images') {
      steps {
        bat 'docker tag %BACKEND_IMAGE%:%IMAGE_TAG% %ECR_REGISTRY%/%BACKEND_IMAGE%:%IMAGE_TAG%'
        bat 'docker tag %FRONTEND_IMAGE%:%IMAGE_TAG% %ECR_REGISTRY%/%FRONTEND_IMAGE%:%IMAGE_TAG%'

        bat 'docker push %ECR_REGISTRY%/%BACKEND_IMAGE%:%IMAGE_TAG%'
        bat 'docker push %ECR_REGISTRY%/%FRONTEND_IMAGE%:%IMAGE_TAG%'

        bat 'docker tag %BACKEND_IMAGE%:%IMAGE_TAG% %ECR_REGISTRY%/%BACKEND_IMAGE%:latest'
        bat 'docker tag %FRONTEND_IMAGE%:%IMAGE_TAG% %ECR_REGISTRY%/%FRONTEND_IMAGE%:latest'

        bat 'docker push %ECR_REGISTRY%/%BACKEND_IMAGE%:latest'
        bat 'docker push %ECR_REGISTRY%/%FRONTEND_IMAGE%:latest'
      }
    }

    stage('Deploy to EKS (Helm)') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
          bat '''
            aws eks update-kubeconfig --region %AWS_REGION% --name %EKS_CLUSTER%
            kubectl create namespace %K8S_NAMESPACE% --dry-run=client -o yaml | kubectl apply -f -
            helm upgrade --install %HELM_RELEASE% %HELM_CHART% ^
              --namespace %K8S_NAMESPACE% ^
              --set backend.image=%ECR_REGISTRY%/%BACKEND_IMAGE% ^
              --set backend.tag=%IMAGE_TAG% ^
              --set frontend.image=%ECR_REGISTRY%/%FRONTEND_IMAGE% ^
              --set frontend.tag=%IMAGE_TAG%
          '''
        }
      }
    }
  }

  post {
    always {
      // Dọn bớt image để tránh đầy ổ trên agent
      bat 'docker image prune -f'
    }
  }
}
