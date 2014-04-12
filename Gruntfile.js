module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json')
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.config('browserify', {
    dist: {
      files: {
        'build/client.js': ['src/<%= pkg.name %>.js'],
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.config('jshint', {
    all: ['Gruntfile.js', 'src/*.js']
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.config('uglify', {
    options: {
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
              '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
              '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
              '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
              ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n'
    },
    minified: {
      files: {
        'client.min.js' : ['build/client.js']
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
        'client.js' : ['build/client.js']
      }
    }
  });

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'browserify', 'uglify']);
};