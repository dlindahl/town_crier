module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      dist: {
        files: {
          'build/town_crier.js': ['src/town_crier.js'],
        }
      }
    },
    jshint: {
      all: ['Gruntfile.js', 'src/*.js']
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n'
      },
      minified: {
        files: {
          'dist/town_crier.min.js' : ['build/town_crier.js']
        }
      },
      unminified: {
        options: {
          mangle : false,
          beautify: {
            beautify: true,
            comments: true,
            indent_level: 2,
            width: 80
          }
        },
        files: {
          'dist/town_crier.js' : ['build/town_crier.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'browserify', 'uglify']);
};