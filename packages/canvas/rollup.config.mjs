import { builtinModules } from 'node:module'

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

const external = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'electron'
]

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/core/index.ts',
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      })
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        // sourcemap: true
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        exports: 'named',
        // sourcemap: true
      }
    ]
  },
  {
    input: 'src/core/index.ts',
    external,
    plugins: [dts()],
    output: {
      file: 'dist/index.d.ts',
      format: 'esm'
    }
  },

  {
    input: 'src/loaders/index.ts',
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      })
    ],
    output: [
      {
        file: 'dist/loaders.js',
        format: 'esm',
        // sourcemap: true
      },
      {
        file: 'dist/loaders.cjs',
        format: 'cjs',
        exports: 'named',
        // sourcemap: true
      }
    ]
  },
  {
    input: 'src/loaders/index.ts',
    external,
    plugins: [dts()],
    output: {
      file: 'dist/loaders.d.ts',
      format: 'esm'
    }
  },

  {
    input: 'src/controls/index.ts',
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      })
    ],
    output: [
      {
        file: 'dist/controls.js',
        format: 'esm',
        // sourcemap: true
      },
      {
        file: 'dist/controls.cjs',
        format: 'cjs',
        exports: 'named',
        // sourcemap: true
      }
    ]
  },
  {
    input: 'src/controls/index.ts',
    external,
    plugins: [dts()],
    output: {
      file: 'dist/controls.d.ts',
      format: 'esm'
    }
  }
]
