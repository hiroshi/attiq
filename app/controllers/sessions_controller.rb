class SessionsController < ApplicationController
  # https://github.com/omniauth/omniauth#rails-without-devise
  # GET /auth/:provider/callback
  def create
    auth = request.env['omniauth.auth']
    user = User.where(uid: auth['uid']).first_or_create!
    user.update(email: auth.dig('info', 'email'))
    session[:user_id] = user.id

    redirect_to root_path
  end
end
