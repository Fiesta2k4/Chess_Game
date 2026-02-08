pipeline {
  agent { label 'windows-docker' }

  environment {
    AWS_REGION   = 'ap-southeast-1'
    ECR_REGISTRY = '855409827685.dkr.ecr.ap-southeast-1.amazonaws.com'

    BACKEND_IMAGE  = 'chess-backend'
    FRONTEND_IMAGE = 'chess-frontend'
    IMAGE_TAG      = "${BUILD_NUMBER}"

    EKS_CLUSTER    = 'chess-eks'
    HELM_RELEASE   = 'chess-game'
    HELM_CHART     = 'deploy/helm/chess-game'
    K8S_NAMESPACE  = 'chess'
  }

  options { timestamps() }

  stages {
    stage('Preflight (Tools)') {
      steps {
        bat 'echo Running on %COMPUTERNAME% && cd'
        bat 'docker version'
        bat 'aws --version'
        bat 'kubectl version --client'
        bat 'helm version'
        bat 'trivy --version'
      }
    }

    stage('A - Lint & Unit Tests') {
      steps {
        /*
        bat '''
          docker run --rm -v "%CD%\\chess_backend:/app" -w /app node:18-alpine sh -lc "npm ci && npm test"
        '''
        bat '''
          docker run --rm -v "%CD%\\chess_frontend:/app" -w /app node:18-alpine sh -lc "npm ci && npm test"
        '''
        */
      }
    }

    stage('B - SCA (npm audit)') {
      steps {
        /*
        bat '''
          docker run --rm -v "%CD%\\chess_backend:/app" -w /app node:18-alpine sh -lc "npm ci --silent && npm audit --audit-level=high || true"
        '''
        bat '''
          docker run --rm -v "%CD%\\chess_frontend:/app" -w /app node:18-alpine sh -lc "npm ci --silent && npm audit --audit-level=high || true"
        '''
        */
      }
    }


    stage('C - SAST (Semgrep)') {
      steps {
        /*
        bat '''
          docker run --rm -v "%CD%:/src" -w /src returntocorp/semgrep semgrep --config=auto --error
        '''
        */
      }
    }

    stage('Build Images') {
      steps {
        bat 'docker build -t %BACKEND_IMAGE%:%IMAGE_TAG% chess_backend'
        bat 'docker build -t %FRONTEND_IMAGE%:%IMAGE_TAG% chess_frontend'
      }
    }

    stage('D - Image Scan (Trivy)') {
      steps {
        /*
        bat 'trivy image --severity HIGH,CRITICAL --exit-code 1 %BACKEND_IMAGE%:%IMAGE_TAG%'
        bat 'trivy image --severity HIGH,CRITICAL --exit-code 1 %FRONTEND_IMAGE%:%IMAGE_TAG%'
        */
      }
    }

    stage('Login to ECR') {
      when { branch 'main' }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
          bat 'aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_REGISTRY%'
        }
      }
    }

    stage('Push Images') {
      when { branch 'main' }
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
      when { branch 'main' }
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
      // dọn images để tránh đầy disk
      bat 'docker image prune -f'
    }
  }
}
