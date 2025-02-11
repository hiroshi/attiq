require 'rails_helper'

RSpec.describe "Sessions", type: :request do
  describe "GET /auth/:provider/callback" do
    let(:uid) { '1234' }
    let(:email) { 'alice@example.com' }
    let!(:user) { }
    let(:expected_user) { user.reload }

    before do
      # https://github.com/omniauth/omniauth/wiki/Integration-Testing
      OmniAuth.config.test_mode = true
      OmniAuth.config.add_mock(:google_oauth2, { uid:, info: { email: }})
      get '/auth/google_oauth2/callback'
    end

    shared_examples_for 'login succeeded' do
      it { expect(response).to redirect_to(root_path) }

      describe 'user.uid' do
        it { expect(expected_user.uid).to eq(uid) }
      end

      describe 'user.email' do
        it { expect(expected_user.email).to eq(email) }
      end
    end

    context 'match no user' do
      let(:expected_user) { User.find_by(uid:, email:) }

      it_behaves_like 'login succeeded'
    end

    context 'match with user.email without uid' do
      let(:user) { User.create!(email:) }

      it_behaves_like 'login succeeded'
    end

    context 'match with user.uid with different email domain' do
      let(:user) { User.create!(uid:, email: 'alice@test.com') }

      it_behaves_like 'login succeeded'
    end
  end
end
