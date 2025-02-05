class SessionsController < ApplicationController
  include SessionsConcern

  # https://github.com/omniauth/omniauth#rails-without-devise
  # GET /auth/:provider/callback
  def create
    auth = request.env['omniauth.auth']
    user = User.where(uid: auth['uid']).first_or_create!
    user.update(email: auth.dig('info', 'email'))
    set_current_user(user)

    redirect_to root_path
  end

  def destroy
    logout

    redirect_to root_path
  end

end
