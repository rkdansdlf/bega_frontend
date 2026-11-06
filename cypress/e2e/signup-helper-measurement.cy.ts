/// <reference types="cypress" />

import { measureWordLines } from '../support/measureWordLines';

describe('Signup helper word measurement calibration', () => {
    it('measures repeated words split across nodes and a line break', () => {
        cy.intercept({ url: '**', middleware: true }, (req) => req.reply({ forceNetworkError: true }));
        cy.document().then((doc) => {
            const fixture = doc.createElement('div');
            fixture.style.cssText = 'position:fixed;top:0;left:0;width:500px;font:20px sans-serif';
            fixture.innerHTML = '<span>가</span><span>나</span> <span>가</span><br><span>나</span>';
            doc.body.appendChild(fixture);
            try {
                expect(measureWordLines(fixture, '가나')).to.deep.equal([1, 2]);
                expect(measureWordLines(fixture, '없는말')).to.deep.equal([]);
                fixture.innerHTML = '<span style="font-size:10px">가</span><span style="font-size:30px">나</span>';
                expect(measureWordLines(fixture, '가나')).to.deep.equal([1]);
                fixture.innerHTML = 'aaaa';
                expect(measureWordLines(fixture, 'aaa')).to.deep.equal([1, 1]);
                fixture.style.cssText += ';width:25px;word-break:break-all';
                fixture.textContent = 'abcdefgh';
                expect(measureWordLines(fixture, 'abcdefgh')[0]).to.be.greaterThan(1);
                fixture.innerHTML = '<span style="display:none">가</span>나';
                expect(() => measureWordLines(fixture, '가나')).to.throw('unsupported hidden or non-inline descendant');
                fixture.innerHTML = '<div>가</div><div>나</div>';
                expect(() => measureWordLines(fixture, '가나')).to.throw('unsupported hidden or non-inline descendant');
                expect(() => measureWordLines(fixture, '')).to.throw('word must not be empty');
            } finally { fixture.remove(); }
        });
    });
});
