import { createSlice } from '@reduxjs/toolkit';

let savedUser = null;
try { savedUser = JSON.parse(localStorage.getItem('staffsync_user') || 'null'); } catch { savedUser = null; }

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: savedUser, bootstrapping: true },
  reducers: {
    setAuth(state, action) {
      state.user = action.payload.user;
      state.bootstrapping = false;
      localStorage.setItem('staffsync_token', action.payload.token);
      localStorage.setItem('staffsync_user', JSON.stringify(action.payload.user));
    },
    setUser(state, action) {
      state.user = action.payload;
      state.bootstrapping = false;
      if (action.payload) localStorage.setItem('staffsync_user', JSON.stringify(action.payload));
    },
    finishBootstrap(state) { state.bootstrapping = false; },
    clearAuth(state) {
      state.user = null;
      state.bootstrapping = false;
      localStorage.removeItem('staffsync_token');
      localStorage.removeItem('staffsync_user');
    },
  },
});

export const { setAuth, setUser, finishBootstrap, clearAuth } = authSlice.actions;
export default authSlice.reducer;
