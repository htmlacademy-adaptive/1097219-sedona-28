import gulp from 'gulp';
import plumber from 'gulp-plumber';
import sass from 'gulp-dart-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import browser from 'browser-sync';
import mozJpeg from 'imagemin-mozjpeg';
import pngQuant from 'imagemin-pngquant';
import svgo from 'imagemin-svgo';
import svgoConfig from './svgo.config.js';
import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';
import { stacksvg } from 'gulp-stacksvg';
import rename from 'gulp-rename';
import replace from 'gulp-replace';
import { deleteAsync } from 'del';

const { src, dest, series, parallel, watch } = gulp;
const isDev = process.argv.includes('--dev');

const styles = () =>
  src('source/sass/style.scss', { sourcemaps: isDev })
    .pipe(plumber())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(dest('build/css', { sourcemaps: '.' }))
    .pipe(rename('style.min.css'))
    .pipe(browser.stream());

const optimizeImages = () =>
  src('source/img/**/*.{jpg,png,svg}')
    .pipe(
      imagemin([
        svgo(svgoConfig),
        pngQuant({
          speed: 1,
          strip: true,
          dithering: 1,
          quality: [0.8, 0.9],
          optimizationLevel: 3,
        }),
        mozJpeg({ quality: 75, progressive: true }),
      ])
    )
    .pipe(dest('build/img'));

const createWebp = () =>
  src(['source/img/**/*.{jpg,png}', '!source/img/favicons/*'])
    .pipe(webp({ quality: 75 }))
    .pipe(dest('build/img'));

const createSprite = () =>
  src('source/sprite/**/*.svg')
    .pipe(imagemin([svgo(svgoConfig)]))
    .pipe(stacksvg({ output: `sprite` }))
    .pipe(dest(`build/img`));

const copy = () =>
  src(['source/{fonts,js}/**/*.{js,woff2,woff}', 'source/*.{html,ico,webmanifest}'], {
    base: 'source',
  }).pipe(dest('build'));

const clean = () => deleteAsync('build');

const postprocessHtml = () =>
  src('build/*.html')
    .pipe(replace(/\s*<script>.*pixelperfect.*\.js"><\/script>/s, ''))
    .pipe(dest('build'));

const reload = (done) => {
  browser.reload();
  done();
};

const server = () => {
  browser.init({
    server: ['build', 'source'],
    cors: true,
    notify: false,
    ui: false,
  });

  watch('source/*.html').on('change', browser.reload);
  watch('source/sass/**/*.scss', styles);
  watch(['source/img/**/*.{jpg,png}', '!source/img/favicons/*'], series(createWebp, reload));
  watch('source/sprite/**/*.svg', series(createSprite, reload));
};

const compile = series(clean, parallel(styles, createSprite, createWebp));
const build = series(compile, parallel(optimizeImages, copy), postprocessHtml);
const dev = series(compile, server);

export default isDev ? dev : build;
