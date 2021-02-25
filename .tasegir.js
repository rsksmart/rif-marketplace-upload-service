module.exports = {
    lint: {
        files: ['src/**/*', 'test/**/*']
    },
    depCheck: {
        ignore: [
            '@types/*', 'tasegir',  '@oclif/*', 'reflect-metadata', 'sqlite3',
            'cross-env', 'libp2p', 'libp2p-crypto', 'check-disk-space'
        ]
    },
    tsconfig: {
        compilerOptions: {
            skipLibCheck: true
        }
    }
}
