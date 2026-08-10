// Vitrine Certa — helper de auth (Supabase)
// Substitui o mock localStorage por auth real (e-mail/senha + Google OAuth).
(function () {
  'use strict';
  window.VC_AUTH = {
    client: null,
    init: function () {
      if (this.client) return this.client;
      if (!window.supabase || !window.VC_SUPABASE) return null;
      this.client = window.supabase.createClient(window.VC_SUPABASE.url, window.VC_SUPABASE.anon);
      return this.client;
    },
    // login e-mail/senha
    async login(email, password) {
      const sb = this.init(); if (!sb) throw new Error('supabase nao inicializado');
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    // cadastro e-mail/senha
    async signup(email, password, meta) {
      const sb = this.init(); if (!sb) throw new Error('supabase nao inicializado');
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: meta || {} }
      });
      if (error) throw error;
      return data;
    },
    // login com Google (OAuth)
    async loginWithGoogle() {
      const sb = this.init(); if (!sb) throw new Error('supabase nao inicializado');
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/hml/dashboard.html' }
      });
      if (error) throw error;
    },
    // sessão atual
    async getSession() {
      const sb = this.init(); if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    // logout
    async logout() {
      const sb = this.init(); if (!sb) return;
      await sb.auth.signOut();
    },
    // grava sessão no estado do portal (mantém compat com header que lê vc_email)
    async syncProfile() {
      const s = await this.getSession();
      if (s && s.user) {
        const email = s.user.email || (s.user.user_metadata && s.user.user_metadata.email) || '';
        try { localStorage.setItem('vc_email', email); } catch (e) {}
      } else {
        try { localStorage.removeItem('vc_email'); } catch (e) {}
      }
      return s;
    }
  };
})();
