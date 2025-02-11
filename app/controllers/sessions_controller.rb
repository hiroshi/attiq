class SessionsController < ApplicationController
  include SessionsConcern

  # https://github.com/omniauth/omniauth#rails-without-devise
  # GET /auth/:provider/callback
  def create
    auth = request.env['omniauth.auth']
    uid = auth['uid']
    email = auth.dig('info', 'email')

    user ||= User.or({uid:}, {email:}).first || User.new
    user.update!(uid:, email:)
    set_current_user(user)

    redirect_to root_path
  end

  def destroy
    logout

    redirect_to root_path
  end
end
