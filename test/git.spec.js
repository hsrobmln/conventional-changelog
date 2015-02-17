describe('git', function() {
  
  var git = require('../lib/git');

  describe('parseRawCommit', function() {

    it('should parse raw commit', function() {
      var msg;
      msg = git.parseRawCommit(
        '9b1aff905b638aa274a5fc8f88662df446d374bd\n' +
        '- feat(scope): broadcast $destroy event on scope destruction\n' + 
        'perf testing shows that in chrome this change adds 5-15% overhead\n' +
        'when destroying 10k nested scopes where each scope has a $destroy listener\n'
      );
	  //console.log(msg);
      expect(msg.items[0].type).to.equal('feat');
      expect(msg.items[0].component).to.equal('scope');
      expect(msg.hash).to.equal('9b1aff905b638aa274a5fc8f88662df446d374bd');
      expect(msg.items[0].subject).to.equal('broadcast $destroy event on scope destruction');
      expect(msg.items[0].body).to.equal(
        '\nperf testing shows that in chrome this change adds 5-15% overhead\n' +
        'when destroying 10k nested scopes where each scope has a $destroy listener\n');
    });
	
	it('should parse multiple commit items', function() {
      var msg;
      msg = git.parseRawCommit(
        '9b1aff905b638aa274a5fc8f88662df446d374bd\n' +
        '- feat(scope): broadcast $destroy event on scope destruction' + 
        '\nP cool fix right here\n' +
		'- impr(controller): improve a stupid issue on the controller' +
		'\nhow frustrating for users!\n'
      );
	  //console.log(msg);
	  expect(msg.items).to.have.length(2);
      expect(msg.items[0].type).to.equal('feat');
      expect(msg.items[0].component).to.equal('scope');
      expect(msg.hash).to.equal('9b1aff905b638aa274a5fc8f88662df446d374bd');
      expect(msg.items[0].subject).to.equal('broadcast $destroy event on scope destruction');
      expect(msg.items[0].body).to.equal('\nP cool fix right here');
	  
	  expect(msg.items[1].type).to.equal('impr');
      expect(msg.items[1].component).to.equal('controller');
	  expect(msg.items[1].subject).to.equal('improve a stupid issue on the controller');
      expect(msg.items[1].body).to.equal('\nhow frustrating for users!\n');
    });
    it('should parse closed issues', function() {
      var msg = git.parseRawCommit(
        '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
        '- feat(ng-list): Allow custom separator\n' +
        'bla bla bla\n\n' +
        'Closes #123\nCloses #25\nFixes #33\n'
      );
	  //console.log(msg.items[0].closes);
      expect(msg.items[0].closes).to.deep.equal([123, 25, 33]);
    });
    it('should parse breaking changes', function() {
      var msg = git.parseRawCommit(
        '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
        '- feat(ng-list): Allow custom separator\n' +
        'bla bla bla\n\n' +
        'BREAKING CHANGE: some breaking change\n'
      );
	  //console.log('BREAKS',msg.breaks);
      expect(msg.breaks).to.deep.equal(['some breaking change\n\n']);
    });
    ['Closes', 'Fixes', 'Resolves'].forEach(function(closeWord) {
      it('should parse ' + closeWord + ' in the subject (and remove it)', function() {
        var msg = git.parseRawCommit(
          '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
          '- feat(xxx): Whatever ' + closeWord + ' #24\n' +
          'bla bla bla\n\n' +
          'What not ?\n'
        );
        expect(msg.items[0].closes).to.deep.equal([24]);
        expect(msg.items[0].subject).to.equal('Whatever');
      });
      it('should work with lowercase ' + closeWord + ' in the subject', function() {
        var msg = git.parseRawCommit(
          '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
          '- feat(xxx): Whatever ' + closeWord.toLowerCase() + ' #24\n' +
          'bla bla bla\n\n' +
          'What not ?\n'
        );
        expect(msg.items[0].closes).to.deep.equal([24]);
        expect(msg.items[0].subject).to.equal('Whatever');
      });
      it('should parse multiple comma-separated issues closed with ' + closeWord + ' #1, #2', function() {
        var msg = git.parseRawCommit(
          '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
          '- fix(yyy): Very cool commit\n' +
          'bla bla bla\n\n' + 
          closeWord + ' #1, #22, #33\n' +
          'What not ?\n'
        );
        expect(msg.items[0].closes).to.deep.equal([1, 22, 33]);
        expect(msg.items[0].subject).to.equal('Very cool commit');
      });
    });
    it('should parse multiple period-separated issues closed with all closed words', function() {
      var msg = git.parseRawCommit(
        '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
        '- fix(zzz): Very cool commit\n' +
        'bla bla bla\n\n' + 
        'Closes #2, #3. Resolves #4. Fixes #5. Fixes #6.\n' +
        'What not ?\n'
      );
      expect(msg.items[0].closes).to.deep.equal([2,3,4,5,6]);
      expect(msg.items[0].subject).to.equal('Very cool commit');
    });
    it('should parse a msg without scope', function() {
      var msg = git.parseRawCommit(
        '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
        '- chore: some chore\n' +
        'bla bla bla\n\n' + 
        'BREAKING CHANGE: some breaking change\n'
      );
      expect(msg.items[0].type).to.equal('chore');
      expect(msg.items[0].subject).to.equal('some chore');
    });
    it('should parse a scope with spaces', function() {
      var msg = git.parseRawCommit(
        '13f31602f396bc269076ab4d389cfd8ca94b20ba\n' +
        '- chore(scope with spaces): some chore\n' +
        'bla bla bla\n\n' +
        'BREAKING CHANGE: some breaking change\n'
      );
      expect(msg.items[0].type).to.equal('chore');
      expect(msg.items[0].subject).to.equal('some chore');
      expect(msg.items[0].component).to.equal('scope with spaces');
    });
  });
});
