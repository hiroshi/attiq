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
    if current_user.blank?
      if request.format.json?
        head :forbidden
      else
        # Let the layout prompt login
        render html: '', layout: 'application'
      end
    end
  end
end
