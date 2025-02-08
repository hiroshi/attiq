class Messages::AcksController < ApplicationController
  include SessionsConcern
  before_action :login_required

  def update
    Message.where(id: params[:message_id], receiver: current_user).update(params.permit(:ack))
  end
end
