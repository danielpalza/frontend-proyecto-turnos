// Pipeline liviano del frontend: build de la app Angular en cada push.
// Ajustar 'NodeJS-22' al nombre real configurado en Manage Jenkins > Tools > NodeJS.
pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }

        // No hay stage de Test: el proyecto todavia no tiene target "test" configurado
        // en angular.json ni specs propios (solo los que trae Angular por defecto, ausentes
        // aqui). Agregar el stage cuando exista una suite real de tests unitarios.
    }

    post {
        success {
            echo 'Pipeline OK: build de Angular generado.'
        }
        failure {
            echo 'Pipeline fallo: revisar el stage marcado en rojo.'
        }
    }
}
