module SessionsConcern
  def current_user
    @current_userr ||= User.find(session[:user_id]) if session[:user_id]
  end

  def set_current_user(user)
    session[:user_id] = user.id
  end

  def logout
    session.delete(:user_id)
    @current_user = nil
  end

  def login_required
    head :forbidden if current_user.blank?
  end
end
