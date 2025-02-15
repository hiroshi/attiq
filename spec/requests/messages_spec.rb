require 'rails_helper'

RSpec.describe "Messages", type: :request do
  describe "POST /messages" do
    context 'with post_key' do
      let(:user) { User.create!(post_key: 'secret') }

      around(:each) do |example|
        original_protection = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
      ensure
        ActionController::Base.allow_forgery_protection = original_protection
      end

      before do
        post '/messages', params: { payload: {'text/plain' => 'test'}, post_key: user.post_key }
      end

      describe 'message' do
        it { expect(Message.where(sender: user, payload: { 'text/plain' => 'test' })).to exist }
      end
    end
  end
end
