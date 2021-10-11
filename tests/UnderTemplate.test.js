'use strict';

const expect = require('chai').expect,
      makeTemplate = require('../src');

describe('UnderTemplate', function() {

   it('returns a function when making a template', function() {
      expect(makeTemplate('Hello <%= name %>')).to.be.a('function');
   });

   function one(tmpl, exp, data, settings) {
      let compiled = makeTemplate(tmpl, settings);

      expect(compiled(data)).to.eql(exp);
   }

   function exception(tmpl, message, data) {
      function make() {
         let compiled = makeTemplate(tmpl);

         return compiled(data);
      }
      expect(make).to.throw(message);
   }

   function testSuite(t, p, exp) {
      it('works with single simple value', function() {
         one('Hello ' + t + ' name %>', exp, {
            name: (p.firstName + ' ' + p.lastName),
         });
      });
      it('works with multiple simple values', function() {
         one('Hello ' + t + ' firstName %> ' + t + ' lastName %>', exp, p);
      });
      it('works with nested objects', function() {
         one('Hello ' + t + ' person.firstName %> ' + t + ' person.lastName %>', exp, { person: p });
      });
      it('works with arrays', function() {
         one('Hello ' + t + ' people[0].firstName %> ' + t + ' people[0].lastName %>', exp, { people: [ p ] });
      });
      it('works with deeply nested objects', function() {
         one('Hello ' + t + ' data.people[0].firstName %> ' + t + ' data.people[0].lastName %>', exp, { data: { people: [ p ] } });
      });
   }

   describe('basic operation', function() {
      testSuite('<%=', { firstName: 'John', lastName: 'Smith' }, 'Hello John Smith');
   });

   describe('does not escape interpolated', function() {
      testSuite('<%=', { firstName: 'John<br>', lastName: 'Smith' }, 'Hello John<br> Smith');
   });

   describe('escapes interpolated', function() {
      testSuite('<%-', { firstName: 'John<br>', lastName: 'Smith' }, 'Hello John&lt;br&gt; Smith');
   });

   describe('conditional sub-template', function() {
      it('works with simple if and false condition', function() {
         one('A<%if(test)%>B<%end%>C', 'AC', { test: false });
      });
      it('works with simple if and true condition', function() {
         one('A<%if(test)%>B<%end%>C', 'ABC', { test: true });
      });
      it('works with simple if with else and false condition', function() {
         one('A<%if(test)%>B<%else%>C<%end%>D', 'ACD', { test: false });
      });
      it('works with simple if with else and true condition', function() {
         one('A<%if(test)%>B<%else%>C<%end%>D', 'ABD', { test: true });
      });

      it('works with white space', function() {
         one(' A <% if\t ( test\t\t) %> B <%      else %> C <%\tend\t%> D ', ' A  C  D ', { test: false });
      });

      it('works with multiple conditionals', function() {
         one('A<%if(test)%>B<%else%>C<%end%>D-1<% if (another) %>2<% else %>3<% end %>4', 'ABD-134', { test: true, another: false });
      });
      it('works with nested conditionals', function() {
         one('A<%if(test)%>-1<% if (another) %>2<% else %>3<% end %>4-<%else%>-5<% if (another) %>6<% else %>7<% end %>8-<%end%>D',
            'A-134-D',
            { test: true, another: false }
         );
      });
      it('works with another nested conditionals', function() {
         one('A<%if(test)%>-1<% if (another) %>2<% else %>3<% end %>4-<%else%>-5<% if (another) %>6<% else %>7<% end %>8-<%end%>D',
            'A-568-D',
            { test: false, another: true });
      });
      it('works with conditional containing loops containing conditionals', function() {
         one('Letters: <%if(test)%><%for(word,letter)%><%if(letter_index)%>-<%end%><%-letter%><%end%>' +
              '<%else%><%for(word,letter)%><%if(letter_index)%>_<%end%><%-letter%><%end%><%end%>',
         'Letters: S-P-E-C-I-A-L',
         { test: true, word: Array.from('SPECIAL') });
      });
   });

   describe('loop sub-template', function() {
      let SCORES_DATA;

      SCORES_DATA = [
         { name: 'Larry', score: 74, pass: true },
         { name: 'Moe', score: 92, pass: true },
         { name: 'Curly', score: 51, pass: false },
      ];

      it('works with simple loop', function() {
         one('I like<% for (fruits, fruit) %> <%-fruit%>,<% end %>',
            'I like apples, oranges, bananas,',
            { fruits: [ 'apples', 'oranges', 'bananas' ] });
      });

      it('works with simple loop over empty array', function() {
         one('I like<% for (fruits, fruit) %> <%-fruit%>,<% end %>',
            'I like',
            { fruits: [] });
      });

      it('works with loop over collection of objects', function() {
         one('Test Scores<br>\n<% for (results, rec) %> <%- rec.name %>: <%- rec.score %>%<br>\n<% end %>',
            'Test Scores<br>\n Larry: 74%<br>\n Moe: 92%<br>\n Curly: 51%<br>\n',
            { results: SCORES_DATA });
      });

      it('works with loop containing conditionals', function() {
         one('Test Scores<br>\n<% for (results, $rec) %> <%- $rec.name %>: <%- $rec.score %>% ' +
            '<% if ($rec.pass) %>PASS<% else %>FAIL<% end %><br>\n<% end %>',
         'Test Scores<br>\n Larry: 74% PASS<br>\n Moe: 92% PASS<br>\n Curly: 51% FAIL<br>\n',
         { results: SCORES_DATA });
      });
   });
   describe('exceptions', function() {
      it('expect the simple unexpected end', function() {
         exception('<%end%>', 'unexpected end of template structure', {});
      });

      it('expect the simple unexpected else', function() {
         exception('<%else%>', 'unexpected else', {});
      });

      it('fails with unending if', function() {
         exception('<% if (test) %>', 'unterminated if', { test: true });
      });
      it('fails with unending loop', function() {
         exception('<% for (list,_it) %>', 'unterminated loop', { list: [] });
      });
   });

   describe('settings', function() {
      it('works with escape regexp', function() {
         one('&{message}', 'test &amp; verify', { message: 'test & verify' },
            { escape: /&{([^}]+?)}/g }
         );
      });

      it('works with interpolate regexp', function() {
         one('${message}', 'test & verify', { message: 'test & verify' },
            { interpolate: /\${([^}]+?)}/g }
         );
      });

      it('works with loop and end regexp', function() {
         one('«loop items as item»"<%-item%>", «end»', '"A", "B", "C", ', { items: Array.from('ABC') },
            { loop: /«\s*loop\s*([^»]+?) as ([^»]+?)»/g, terminate: /«\s*(end)\s*»/g }
         );
      });

      it('works with if and end regexp', function() {
         one('## IF test THEN ##True## ELSE ##False## END ##', 'False', { test: false },
            { conditional: /##\s*IF\s([^#]+?)\sTHEN\s*##/g, alternative: /##\s*(ELSE)\s*##/g, terminate: /##\s*(END)\s*##/g }
         );
      });
   });
});
