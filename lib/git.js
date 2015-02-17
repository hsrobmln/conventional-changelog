var extend = require('lodash.assign');
var cp = require('child_process');
var es = require('event-stream');
var util = require('util');
module.exports = {
  parseRawCommit: parseRawCommit,
  getCommits: getCommits,
  latestTag: latestTag
};

//Get latest tag, or if no tag first commit
function latestTag(done) {
  //Get tags sorted by date
  cp.exec("git describe --tags `git rev-list --tags --max-count=1`", function(err, stdout, stderr) {
    if (err) {
      getFirstCommit(done);
    } else {
      done(null, String(stdout).trim());
    }
  });
}

function getFirstCommit(done) {
  //Error --> no tag, get first commit
  cp.exec('git log --format="%H" --pretty=oneline --reverse', function(err, stdout, stderr) {
    if (stderr || !String(stdout).trim()) {
      done('No commits found!');
    } else {
      // return empty string for first commit to appear in changelog
      done(null, '');
    }
  });
}

function filterExists(data, cb) {
  if (data) cb(null, data);
  else cb();  //get rid of blank lines
}

function getCommits(options, done) {
  options = extend({
    grep: '^feat|^fix|BREAKING',
    format: '%H%n%s%n%b%n==END==',
    from: '',
    to: 'HEAD'
  }, options || {});

  var cmd = 'git log --grep="%s" -E --format=%s %s';
  cmd = util.format(
    cmd,
    options.grep,
    options.format,
    options.from ? '"' + options.from + '..' + options.to + '"' : ''
  );

  return es.child(cp.exec(cmd))
    .pipe(es.split('\n==END==\n'))
    .pipe(es.map(function(data, cb) {
      var commit = parseRawCommit(data, options);
      if (commit) cb(null, commit);
      else cb();
    }))
    .pipe(es.writeArray(done));
}

var SUBJECT_PATTERN = /^[\-\s]*(\w*)(\(([\w\$\.\-\* ]*)\))?\: (.*)$/;
function parseRawCommit(raw, options) {
  if (!raw) {
    return null;
  }

  var lines = raw.split('\n');
  var msg = {}, match;

  msg.hash = lines.shift();
  msg.items = parseCommitItem([], lines);  
  msg.breaks = [];
  match = raw.match(/BREAKING CHANGE:\s([\s\S]*)/);
  if (match) {
    msg.breaks.push(match[1] + '\n');
  }

  return msg;
}

function parseCommitItem(currentItems, remainingLines, item){
	if(!remainingLines.length) {
		if(item !== undefined) {		
			currentItems.push(item);
		}
		return currentItems;
	}
	if(item === undefined) {
		item = {};
		item.subject = '';
		item.body = '';
		item.closes = [];
	}	
	
	var nextLine = remainingLines.shift();
	var matchesSubj = nextLine.match(SUBJECT_PATTERN);
	
	if (matchesSubj) {		
		item.type = matchesSubj[1];
		item.component = matchesSubj[3];
		item.subject = matchesSubj[4];
		
		item.subject = item.subject.replace(/\s*(?:Closes|Fixes|Resolves)\s#(\d+)/ig, function(_, i) {
			item.closes.push(parseInt(i, 10));
			return '';
		});
	}
	else {
		item.body += '\n' + nextLine;
		
		var matchesClose = nextLine.match(/(?:Closes|Fixes|Resolves)\s((?:#\d+(?:\,\s)?)+)/ig);
		if (matchesClose) { 
			matchesClose.forEach(function(m) {
			  m && m.split(',').forEach(function(i) {
				var issue = i.match(/\d+/);
				issue && item.closes.push(parseInt(issue[0], 10));
			  });
			});
		}
	}
	
	if(remainingLines.length){
		var nextRemainingLineIsSubject = remainingLines[0].match(SUBJECT_PATTERN);
		if(nextRemainingLineIsSubject) {
			currentItems.push(item);
			return parseCommitItem(currentItems, remainingLines);
		}
		else return parseCommitItem(currentItems, remainingLines, item);
	}
	else{
		currentItems.push(item);
		return currentItems;
	}
}