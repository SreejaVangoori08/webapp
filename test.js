
const request = require('supertest')
const app = require('./server')
const chai = require('chai')
const expect = chai.expect

// describe('Authentication Tests', function() {
//     describe('Successes', function() {
//         it('Email Validation', function(done) {
//             request(app).post('/v1/user').send({
//               email: "sk123@gmail",
//               password: "Sreeja@123",
//               first_name: "sreeja",
//               last_name: "v"
//   }).end(function(err, res) {
//                 expect(res.statusCode).to.be.equal(400);
                
//                 done();
//                 console.log(res.statusCode);
//             })
//         })
//     })
// })

// describe('Authentication Tests', function() {
//     describe('Successes', function() {
//         it('Last name Validation', function(done) {
//             request(app).post('/v1/user').send({
//               email: "sk123@gmail.com",
//               password: "Sreeja@123",
//               first_name: "sreeja"
//   }).end(function(err, res) {
//                 expect(res.statusCode).to.be.equal(400);
                
//                 done();
//                 console.log(res.statusCode);
//             })
//         })
//     })
// })
var assert = require('assert');
describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal([1, 2, 3].indexOf(2), -1);
    });
  });
});

describe('Health Test', function() {
    describe('Successes', function() {
        it('health', function(done) {
            request(app).get('/healthz').send({
  }).end(function(err, res) {
                expect(res.statusCode).to.be.equal(200);
                done();
                console.log(res.statusCode);
            })
        })
    })
})
