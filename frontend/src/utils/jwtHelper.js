import * as jwtLib from 'jwt-decode';

const jwtDecode = jwtLib.default ?? jwtLib.jwtDecode ?? jwtLib;

export default jwtDecode;
