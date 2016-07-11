defmodule Perf.ErrorHelpers do
  def format(changeset) do
    Ecto.Changeset.traverse_errors(
      changeset, 
      &translate_error/1
    )
  end

  def translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, _acc ->
      String.replace(msg, "%{#{key}}", to_string(value))
    end)
  end
end