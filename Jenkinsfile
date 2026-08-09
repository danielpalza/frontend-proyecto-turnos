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

        stage('Disparar E2E') {
            // Dispara el job E2E (frontend-proyecto-test en Jenkins; AJUSTAR AL NOMBRE REAL
            // si el job Jenkins se llama distinto al repo -- ver docs/CI_CD.md #2.1).
            //
            // Restringido a 'main': si este job resultara ser un Pipeline simple (no
            // multibranch), env.BRANCH_NAME no existe y `?: ''` lo trata como "no es main" --
            // evita disparar el E2E (y en cadena, el deploy fire-and-forget) desde una rama de
            // feature o desde un contexto que todavia no podemos confirmar que es main.
            when {
                beforeAgent true
                expression { (env.BRANCH_NAME ?: '') == 'main' }
            }
            steps {
                build job: 'frontend-proyecto-test', wait: false
            }
        }
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
